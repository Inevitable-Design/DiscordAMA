import time
from io import BytesIO
from pathlib import Path

import cloudinary
import cloudinary.uploader

import modal

cuda_version = "12.4.0"
flavor = "devel"
operating_sys = "ubuntu22.04"
tag = f"{cuda_version}-{flavor}-{operating_sys}"

cuda_dev_image = modal.Image.from_registry(
    f"nvidia/cuda:{tag}", add_python="3.11"
).entrypoint([])

diffusers_commit_sha = "81cf3b2f155f1de322079af28f625349ee21ec6b"

flux_image = (
    cuda_dev_image.apt_install(
        "git",
        "libglib2.0-0",
        "libsm6",
        "libxrender1",
        "libxext6",
        "ffmpeg",
        "libgl1",
    )
    .pip_install(
        "invisible_watermark==0.2.0",
        "transformers==4.44.0",
        "huggingface_hub[hf_transfer]==0.26.2",
        "accelerate==0.33.0",
        "safetensors==0.4.4",
        "sentencepiece==0.2.0",
        "torch==2.5.0",
        f"git+https://github.com/huggingface/diffusers.git@{diffusers_commit_sha}",
        "numpy<2",
        "pillow==11.0.0",
        "protobuf==3.20.0",
        "cloudinary==1.41.0",
        "fastapi[standard]"
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

flux_image = flux_image.env(
    {"TORCHINDUCTOR_CACHE_DIR": "/root/.inductor-cache"}
).env({"TORCHINDUCTOR_FX_GRAPH_CACHE": "1"})

app = modal.App("flux_schnell", image=flux_image)

with flux_image.imports():
    import torch
    from diffusers import FluxPipeline

MINUTES = 60  # seconds
VARIANT = "schnell"
NUM_INFERENCE_STEPS = 4


@app.cls(
    gpu="A100",
    container_idle_timeout=10 * MINUTES,
    timeout=30 * MINUTES,
    volumes={
        "/root/.nv": modal.Volume.from_name("nv-cache", create_if_missing=True),
        "/root/.triton": modal.Volume.from_name(
            "triton-cache", create_if_missing=True
        ),
        "/root/.inductor-cache": modal.Volume.from_name(
            "inductor-cache", create_if_missing=True
        ),
    },
    concurrency_limit=50
)
class Model:
    from PIL import Image

    import os
    from cloudinary.utils import cloudinary_url
    os.environ['CLOUDINARY_URL'] = '<SECRET>'

    compile: int = (
        modal.parameter(default=0)
    )

    def setup_model(self):
        from huggingface_hub import snapshot_download
        from transformers.utils import move_cache

        snapshot_download(f"black-forest-labs/FLUX.1-{VARIANT}")

        move_cache()

        pipe = FluxPipeline.from_pretrained(
            f"black-forest-labs/FLUX.1-{VARIANT}", torch_dtype=torch.bfloat16
        )

        return pipe

    @modal.build()
    def build(self):
        self.setup_model()

    @modal.enter()
    def enter(self):
        pipe = self.setup_model()
        pipe.to("cuda")
        self.pipe = optimize(pipe, compile=bool(self.compile))

        # Configuration       
        cloudinary.config( 
            cloud_name = "<SECRET>", 
            api_key = "<SECRET>", 
            api_secret = "<SECRET>",
            secure = False
        )
    
    def is_nsfw_image(self, image: Image.Image) -> bool:
        from transformers import CLIPProcessor, CLIPModel

        model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
        
        inputs = processor(text=["NSFW", "SFW"], images=image, return_tensors="pt", padding=True)
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)
        nsfw_prob = probs[0][0].item()

        return nsfw_prob > 0.5
    
    def generate_random_string(self, length=10):
        import random
        import string

        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))


    @modal.method()
    def inference(
        self, prompt: str,
        height: int = 512, width: int = 512,
        server_override:bool = False
        ):
        
        print("🎨 generating image...")
        
        t_1 = time.time()

        out = self.pipe(
            prompt,
            output_type="pil",
            num_inference_steps=NUM_INFERENCE_STEPS,
            height=height,
            width=width,
        ).images[0]

        print(f"🎨 Basic Inference Latency (w/o Loading Pipeline): {time.time() - t_1:.2f} seconds")

        # Allowing over-riding of NSFW guard
        if server_override:
            None
        else:
            if self.is_nsfw_image(out):
                return 420
        
        byte_stream = BytesIO()
        out.save(byte_stream, format="JPEG")

        output_path = Path("/tmp") / "flux" / "output.jpg"
        output_path.parent.mkdir(exist_ok=True, parents=True)
        output_path.write_bytes(byte_stream.getvalue())
        print(f"🎨 saved output to {output_path}")

        file_name = self.generate_random_string()
        print(f"🐦‍⬛ File Name: {file_name}")

        upload_result = cloudinary.uploader.upload(byte_stream.getvalue(), public_id=file_name)
        output_end = upload_result["secure_url"]
        print(output_end)
        
        return output_end

@app.function(concurrency_limit=50, gpu="A100",)
@modal.web_endpoint(method="POST")
def inference(
    item:dict
):
    import cloudinary
    import cloudinary.uploader
    from cloudinary.utils import cloudinary_url

    prompt, compile, h, w, server_override = item['prompt'], item['compile'], item['h'], item['w'], item['override']
    
    prompt = str(prompt)
    server_override = True if server_override == "True" else False

    compile = 1 if compile == "True" else 0

    h = 256 if h == "" else h
    w = 256 if w == "" else w

    print(f"""\n\n
==================================================
I'm in
          
          Prompt: {prompt},
          Compile: {compile},
          
          Height: {h},
          Width: {w}
==================================================
\n\n
""")

    t0 = time.time()
    img_url = Model(compile=compile).inference.remote(prompt, h, w, server_override)
    print(f"🎨 first inference latency: {time.time() - t0:.2f} seconds")
    
    op_dict = {
        "img": str(img_url)
    }
    
    if server_override:
        None
    else:
        if img_url==420:
            print("Image is NSFW")
            return op_dict

    print(op_dict)
    return op_dict

def optimize(pipe, compile=True):
    pipe.transformer.fuse_qkv_projections()
    pipe.vae.fuse_qkv_projections()

    pipe.transformer.to(memory_format=torch.channels_last)
    pipe.vae.to(memory_format=torch.channels_last)

    if not compile:
        return pipe

    config = torch._inductor.config
    config.disable_progress = False
    config.conv_1x1_as_mm = True
    config.coordinate_descent_tuning = True
    config.coordinate_descent_check_all_directions = True
    config.epilogue_fusion = False

    pipe.transformer = torch.compile(
        pipe.transformer, mode="max-autotune", fullgraph=True
    )
    pipe.vae.decode = torch.compile(
        pipe.vae.decode, mode="max-autotune", fullgraph=True
    )

    print("🔦 running torch compiliation (may take up to 20 minutes)...")

    pipe(
        "dummy prompt to trigger torch compilation",
        output_type="pil",
        # use ~50 for [dev], smaller for [schnell]
        num_inference_steps=NUM_INFERENCE_STEPS,
    ).images[0]

    print("🔦 finished torch compilation")

    return pipe